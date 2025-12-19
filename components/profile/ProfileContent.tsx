'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navigation from '@/components/dashboard/Navigation'
import { Upload, Save, User, LogOut, BookOpen } from 'lucide-react'
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
  const router = useRouter()
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
        title: 'Error',
        description: 'Image size cannot exceed 5MB',
        variant: 'destructive',
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
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
    console.log('=== handleSave 開始執行 ===')
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
          throw new Error('Failed to upload avatar')
        }
      }

      // 如果用戶已經有 userID，則不發送 userID 欄位（不允許修改）
      const requestBody: any = {
        name: name.trim() || null,
      }
      
      // 只有在圖片有變化時才發送 image
      if (imageFile || imageUrl !== userData?.image) {
        requestBody.image = imageUrl
      }
      
      // 只有在用戶還沒有 userID 時，才發送 userID 欄位
      if (!userData?.userID) {
        requestBody.userID = userID.trim() || null
      }

      console.log('發送更新請求:', requestBody)
      console.log('當前 userData:', userData)
      console.log('當前 name:', name)

      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('API 回應狀態:', res.status, res.statusText)

      if (!res.ok) {
        const error = await res.json()
        console.error('API 錯誤:', error)
        throw new Error(error.error || 'Update failed')
      }

      const updatedData = await res.json()
      console.log('API 返回的資料:', updatedData)
      
      // 直接使用 API 返回的資料更新狀態
      setUserData(updatedData)
      setName(updatedData.name || '')
      setUserID(updatedData.userID || '')
      setImagePreview(updatedData.image)
      setImageFile(null) // 清除已上傳的檔案

      console.log('狀態已更新，新的 name:', updatedData.name)

      toast({
        title: 'Success',
        description: 'Profile updated',
      })
    } catch (error: any) {
      console.error('handleSave 發生錯誤:', error)
      console.error('錯誤詳情:', error.message)
      console.error('錯誤堆疊:', error.stack)
      toast({
        title: 'Failed',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      console.log('handleSave 完成，saving 狀態設為 false')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-20">
        <div className="text-black/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wide mb-8">
          Profile
        </h1>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-sm">
            <Label className="text-sm font-semibold text-black mb-4 block">
              Avatar
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
                  Upload Avatar
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
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
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
                  placeholder="Enter your User ID"
                  className={`max-w-md ${userData?.userID ? 'bg-gray-50' : ''}`}
                  disabled={!!userData?.userID}
                />
                <p className="text-xs text-black/60 mt-2">
                  {userData?.userID 
                    ? 'User ID cannot be changed' 
                    : 'This ID will be used for friend search. Cannot be changed after setting'}
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
                  Email cannot be changed
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={async () => {
                // Reset tutorial completion and redirect to tutorial
                try {
                  await fetch('/api/tutorial/reset', { method: 'POST' })
                  router.push('/tutorial')
                } catch (error) {
                  console.error('Failed to reset tutorial:', error)
                }
              }}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Replay Tutorial
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  )
}

