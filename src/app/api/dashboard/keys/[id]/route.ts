import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, isActive, rateLimit } = await request.json();
    const { id } = params;

    // Verify the API key belongs to the user
    const existingKey = await db.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (rateLimit !== undefined) updateData.rateLimit = parseInt(rateLimit);

    const updatedKey = await db.apiKey.update({
      where: { id },
      data: updateData
    });

    // Clear cache
    cache.delete(`api-keys:${session.user.id}`);
    cache.delete(`overview:${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedKey.id,
        key: updatedKey.key,
        name: updatedKey.name,
        isActive: updatedKey.isActive,
        rateLimit: updatedKey.rateLimit,
        createdAt: updatedKey.createdAt.toISOString(),
        lastUsedAt: updatedKey.lastUsedAt?.toISOString()
      }
    });
  } catch (error) {
    console.error('API Key PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify the API key belongs to the user
    const existingKey = await db.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    await db.apiKey.delete({
      where: { id }
    });

    // Clear cache
    cache.delete(`api-keys:${session.user.id}`);
    cache.delete(`overview:${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('API Key DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}