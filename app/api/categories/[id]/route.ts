import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
})

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const categoryId = resolvedParams.id

    if (!categoryId) {
      return NextResponse.json({ error: 'Missing category ID' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Ensure only own categories can be modified
    if (category.userId !== user.id) {
      return NextResponse.json({ error: 'No permission to modify this category' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = categoryUpdateSchema.parse(body)

    // If name is being updated, check for uniqueness
    if (validatedData.name && validatedData.name !== category.name) {
      const existing = await prisma.category.findUnique({
        where: {
          userId_typeId_name: {
            userId: user.id,
            typeId: category.typeId,
            name: validatedData.name,
          },
        },
      })

      if (existing) {
        return NextResponse.json({ error: 'This category name already exists' }, { status: 400 })
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: validatedData,
      include: {
        type: true,
      },
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Update category error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const categoryId = resolvedParams.id

    if (!categoryId) {
      return NextResponse.json({ error: 'Missing category ID' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        type: true,
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Ensure only own categories can be deleted
    if (category.userId !== user.id) {
      return NextResponse.json({ error: 'No permission to delete this category' }, { status: 403 })
    }

    // Check if any transactions use this category
    const transactionsUsingCategory = await prisma.transaction.findFirst({
      where: {
        categoryId: categoryId,
      },
    })

    if (transactionsUsingCategory) {
      return NextResponse.json({ 
        error: 'Cannot delete this category because there are still transactions using it. Please delete or modify related transactions first.' 
      }, { status: 400 })
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}

