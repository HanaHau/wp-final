import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const results: any[] = []

    // Test different model names
    const modelNames = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro',
      'models/gemini-pro',
    ]

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        // Try a simple test call
        const result = await model.generateContent('test')
        const response = await result.response
        results.push({
          modelName,
          status: 'success',
          response: response.text().substring(0, 50),
        })
      } catch (error: any) {
        results.push({
          modelName,
          status: 'error',
          error: error.message,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

