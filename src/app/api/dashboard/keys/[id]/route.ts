import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100, 'Name too long').optional(),
  isActive: z.boolean().optional(),
  rateLimit: z.number().min(1, 'Rate limit must be at least 1').max(10000, 'Rate limit too high').optional(),
});

// PUT /api/dashboard/keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateData = updateKeySchema.parse(body);

    // Check if the API key belongs to the user
    const existingKey = await db.apiKey.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    const updatedKey = await db.apiKey.update({
      where: {
        id: params.id,
      },
      data: updateData,
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    // Mask the key for response
    const responseKey = {
      ...updatedKey,
      key: updatedKey.key.substring(0, 10) + '...',
    };

    return NextResponse.json({
      success: true,
      data: responseKey,
      message: 'API key updated successfully',
    });
  } catch (error) {
    console.error('Failed to update API key:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the API key belongs to the user
    const existingKey = await db.apiKey.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion if it's the user's only key
    const keyCount = await db.apiKey.count({
      where: {
        userId: session.user.id,
      },
    });

    if (keyCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete your only API key' },
        { status: 400 }
      );
    }

    await db.apiKey.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}