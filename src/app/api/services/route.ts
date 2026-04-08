import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where = {
      companyId: session.user.companyId,
      ...(active !== null ? { isActive: active === 'true' } : {}),
      ...(type ? { type: type.toUpperCase() as any } : {}),
      ...(category ? { category: { equals: category, mode: 'insensitive' as const } } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const services = await prisma.service.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, type, price, cost, duration, unit, isActive } = body;

    const service = await prisma.service.create({
      data: {
        name,
        description,
        category,
        type: type?.toUpperCase() || 'SERVICE',
        price,
        cost,
        duration,
        unit,
        isActive: isActive ?? true,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}