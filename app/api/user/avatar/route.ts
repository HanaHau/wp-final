import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: '沒有上傳檔案' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案大小不能超過 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filename = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    const imageUrl = `/uploads/avatars/${filename}`

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('上傳頭像失敗:', error)
    return NextResponse.json({ error: '上傳頭像失敗' }, { status: 500 })
  }
}

