import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

// Initialize Gemini API - will be set when API key is available
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

interface ChatResponse {
  message: string
  isTransaction?: boolean
  transactionData?: {
    amount: number
    type: 'EXPENSE' | 'INCOME'
    categoryName: string
    date?: string
    note?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // Check if API key is set and initialize Gemini
    try {
      getGenAI()
    } catch (error: any) {
      console.error('Gemini API initialization error:', error)
      return NextResponse.json(
        {
          message: 'API 設定錯誤，請聯繫管理員',
          isTransaction: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user's categories for context
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null }, // Default categories
          { userId: user.id }, // User's own categories
        ],
      },
      include: {
        type: true,
      },
      orderBy: [
        { typeId: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    // Get pet info for context
    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    // Build category list for prompt
    const expenseCategories = categories
      .filter((c) => c.typeId === 1)
      .map((c) => c.name)
      .join(', ')
    const incomeCategories = categories
      .filter((c) => c.typeId === 2)
      .map((c) => c.name)
      .join(', ')

    // Create system prompt
    const systemPrompt = `You are ${pet?.name || 'Pet'}, a friendly and helpful pet companion in a personal accounting app. 

Your primary role is to be a companion and friend to the user. You can chat naturally about anything - daily life, feelings, encouragement, jokes, or just casual conversation.

IMPORTANT: Only parse as a transaction when the user EXPLICITLY wants to record a transaction. Examples of transaction requests:
- "我花了100元買午餐" (I spent 100 on lunch)
- "記帳：今天收入5000元" (Record: earned 5000 today)
- "幫我記一下，午餐花了150元" (Help me record, lunch cost 150)

Examples of regular chat (NOT transactions):
- "你好" (Hello)
- "今天過得怎麼樣？" (How was your day?)
- "我好累" (I'm tired)
- "給我一些鼓勵" (Give me some encouragement)
- "講個笑話" (Tell me a joke)
- General conversation, questions, or emotional support

When user wants to record a transaction:
- Extract: amount (number), type ("EXPENSE" or "INCOME"), categoryName (must match EXACTLY from the list below), note (optional)
- DO NOT include date - the app uses today's date automatically

CRITICAL: categoryName MUST match EXACTLY one of the available categories. Pay close attention to the user's description and match it to the most appropriate category.

Available EXPENSE categories (typeId = 1): ${expenseCategories || 'None'}

Category matching guide (examples):
- Food/Meals/Lunch/Dinner/Snacks/Restaurant → "Food"
- Movie/Cinema/Theater/Entertainment/Game/Concert → "Entertainment"
- Bus/Taxi/Train/Subway/Gas/Parking → "Transportation"
- Shopping/Clothes/Electronics/Online shopping → "Shopping"
- Doctor/Hospital/Medicine/Pharmacy → "Healthcare"
- School/Tuition/Books/Course → "Education"
- Office/Work expenses/Business → "Work"
- Rent/Housing/Utilities/Electricity → "Housing"
- Anything else → "Other"

Available INCOME categories (typeId = 2): ${incomeCategories || 'None'}

Category matching guide (examples):
- Salary/Paycheck/Work income → "Salary"
- Bonus/Extra payment → "Bonus"
- Stock/Dividend/Investment return → "Investment"
- Gift money/Present → "Gift"
- Anything else → "Other"

Response format:
- For transaction requests, use JSON:
{
  "isTransaction": true,
  "transactionData": {
    "amount": number,
    "type": "EXPENSE" or "INCOME",
    "categoryName": "exact category name",
    "note": "string" (optional)
  },
  "message": "friendly confirmation message"
}

- For regular chat, use JSON:
{
  "isTransaction": false,
  "message": "your friendly, natural response as a pet companion"
}

Be warm, empathetic, and engaging. Use emojis occasionally. For chat, respond naturally and conversationally (can be longer than 1-2 sentences if appropriate). For transactions, keep confirmation messages brief.`

    // Use gemini-2.5-flash (latest available model, faster and cheaper)
    // According to the API, available models are: gemini-2.5-flash, gemini-2.5-pro
    const ai = getGenAI()
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
    })
    console.log('Using model: gemini-2.5-flash')

    const chatPrompt = `${systemPrompt}

User message: "${message}"

IMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or explanatory text. Just the JSON object.`

    let result
    try {
      // Use the correct API format - generateContent accepts a string directly
      result = await model.generateContent(chatPrompt)
    } catch (error: any) {
      console.error('Gemini API call failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Check for specific error types
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
        return NextResponse.json(
          {
            message: 'API 金鑰無效，請檢查設定',
            isTransaction: false,
            error: 'API_KEY_INVALID',
          },
          { status: 500 }
        )
      }
      
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('is not found')) {
        // Model not found - try to list available models or suggest alternatives
        return NextResponse.json(
          {
            message: `模型不可用。錯誤: ${error.message}。請確認您的 API 金鑰有權限存取 Gemini 模型，或聯繫管理員檢查模型設定。`,
            isTransaction: false,
            error: 'MODEL_NOT_FOUND',
          },
          { status: 500 }
        )
      }
      
      throw error
    }
    
    const response = await result.response
    let text: string
    try {
      text = response.text().trim()
    } catch (error: any) {
      console.error('Failed to get text from response:', error)
      // Try alternative method to get response
      const candidates = response.candidates
      if (candidates && candidates.length > 0 && candidates[0].content) {
        text = candidates[0].content.parts.map((p: any) => p.text).join('').trim()
      } else {
        throw new Error('無法從 Gemini 回應中取得文字內容')
      }
    }

    // Try to parse JSON from response
    let chatResponse: ChatResponse
    try {
      // Remove markdown code blocks if present
      let cleanedText = text
      if (text.includes('```')) {
        cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }
      
      // Extract JSON object - try multiple patterns
      let jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        // Try to find JSON in the text more flexibly
        const jsonStart = cleanedText.indexOf('{')
        const jsonEnd = cleanedText.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonMatch = [cleanedText.substring(jsonStart, jsonEnd + 1)]
        }
      }
      
      if (jsonMatch) {
        try {
          chatResponse = JSON.parse(jsonMatch[0])
          console.log('Parsed Gemini response:', chatResponse)
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'JSON string:', jsonMatch[0])
          // Fallback: treat as regular message
          chatResponse = {
            message: cleanedText || '我聽不懂，請再試一次！',
            isTransaction: false,
          }
        }
      } else {
        // Fallback: treat as regular message
        console.warn('No JSON found in response, treating as regular message:', cleanedText)
        chatResponse = {
          message: cleanedText || '我聽不懂，請再試一次！',
          isTransaction: false,
        }
      }
    } catch (error) {
      console.error('Failed to parse Gemini response:', error, 'Response text:', text)
      // If parsing fails, treat as regular message
      chatResponse = {
        message: text || '我聽不懂，請再試一次！',
        isTransaction: false,
      }
    }

    // Validate transaction data if present
    if (chatResponse.isTransaction && chatResponse.transactionData) {
      const { amount, type, categoryName } = chatResponse.transactionData

      // Validate amount
      if (!amount || amount <= 0 || isNaN(amount)) {
        console.warn('Invalid amount:', amount)
        chatResponse.isTransaction = false
        chatResponse.message = '我無法理解金額，請再試一次！'
        delete chatResponse.transactionData
      }

      // Validate type
      if (type !== 'EXPENSE' && type !== 'INCOME') {
        console.warn('Invalid type:', type)
        chatResponse.isTransaction = false
        chatResponse.message = '我無法理解這是支出還是收入，請再試一次！'
        delete chatResponse.transactionData
      }

      // Validate category exists
      if (categoryName) {
        const categoryExists = categories.some(
          (c) => c.name === categoryName && c.typeId === (type === 'EXPENSE' ? 1 : 2)
        )
        if (!categoryExists) {
          console.warn('Category not found:', categoryName, 'Available categories:', categories.map(c => c.name))
          chatResponse.isTransaction = false
          chatResponse.message = `我找不到「${categoryName}」這個分類，請確認分類名稱是否正確。`
          delete chatResponse.transactionData
        }
      } else {
        console.warn('Category name missing')
        chatResponse.isTransaction = false
        chatResponse.message = '我無法理解分類，請再試一次！'
        delete chatResponse.transactionData
      }
    }

    console.log('Final chat response:', JSON.stringify(chatResponse, null, 2))
    return NextResponse.json(chatResponse)
  } catch (error: any) {
    console.error('Chat API error:', error)
    const errorMessage = error?.message || '未知錯誤'
    console.error('Error details:', errorMessage)
    
    return NextResponse.json(
      {
        message: `抱歉，我現在無法回應：${errorMessage}`,
        isTransaction: false,
      },
      { status: 500 }
    )
  }
}

