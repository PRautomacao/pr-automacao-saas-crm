import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateTicketNumber } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = {
      companyId: session.user.companyId,
      ...(status && status !== 'all' ? { status: status.toUpperCase() } : {}),
      OR: search ? [
        { title: { contains: search, mode: 'insensitive' as const } },
        { ticketNumber: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ] : undefined,
    };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: true,
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
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
    const { title, description, priority, customerId, serviceId, tags } = body;

    const ticketNumber = generateTicketNumber();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        priority: priority || 'MEDIUM',
        customerId,
        serviceId,
        tags: tags || [],
        companyId: session.user.companyId,
        assignedToId: session.user.id,
      },
      include: {
        customer: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}