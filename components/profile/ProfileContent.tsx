'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navigation from '@/components/dashboard/Navigation'
import { Upload, Save, User } from 'lucide-react'
import Image from 'next/image'

interface UserData {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
}

export default function ProfileContent() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [name, setName] = useState('')
  const [userID, setUserID] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/user')
      if (res.ok) {
        const data = await res.json()
        setUserData(data)
        setName(data.name || '')
        setUserID(data.userID || '')
        setImagePreview(data.image)
      }
    } catch (error) {
      console.error('取得使用者資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '錯誤',
        description: '圖片大小不能超過 5MB',
        variant: 'destructive',
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: '錯誤',
        description: '請選擇圖片檔案',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let imageUrl = userData?.image || null

      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)

        const uploadRes = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          imageUrl = uploadData.imageUrl
        } else {
          throw new Error('上傳頭像失敗')
        }
      }

      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          userID: userID.trim() || null,
          image: imageUrl,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '更新失敗')
      }

      toast({
        title: '成功',
        description: '個人資料已更新',
      })

      await fetchUserData()
    } catch (error: any) {
      toast({
        title: '失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-20">
        <div className="text-black/60">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wide mb-8">
          個人資料
        </h1>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-sm">
            <Label className="text-sm font-semibold text-black mb-4 block">
              頭像
            </Label>
            <div className="flex items-center gap-6">
              <div className="relative">
                {imagePreview ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-black/20">
                    <Image
                      src={imagePreview}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold border-2 border-black/20">
                    {name?.charAt(0) || session?.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  上傳頭像
                </Button>
                {imageFile && (
                  <p className="text-xs text-black/60 mt-2">
                    {imageFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-semibold text-black mb-2 block">
                  名稱
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="輸入您的名稱"
                  className="max-w-md"
                />
              </div>

              <div>
                <Label htmlFor="userID" className="text-sm font-semibold text-black mb-2 block">
                  User ID
                </Label>
                <Input
                  id="userID"
                  value={userID}
                  onChange={(e) => setUserID(e.target.value)}
                  placeholder="輸入您的 User ID"
                  className="max-w-md"
                />
                <p className="text-xs text-black/60 mt-2">
                  此 ID 將用於好友搜尋，設定後無法更改
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-black mb-2 block">
                  Email
                </Label>
                <Input
                  value={session?.user?.email || ''}
                  disabled
                  className="max-w-md bg-gray-50"
                />
                <p className="text-xs text-black/60 mt-2">
                  Email 無法更改
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? '儲存中...' : '儲存變更'}
            </Button>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  )
}

