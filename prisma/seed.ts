import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create companies
  const company1 = await prisma.company.upsert({
    where: { slug: 'bio-analise' },
    update: {},
    create: {
      name: 'Bio Análise Laboratório',
      slug: 'bio-analise',
      niche: 'Saúde/Laboratório',
      phone: '(62) 3232-3232',
      email: 'contato@bioanalise.com.br',
      address: 'Av. T-9, 456, St. Bueno, Goiânia-GO',
      document: '12.345.678/0001-90',
      isActive: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        language: 'pt-BR',
      },
    },
  });

  const company2 = await prisma.company.upsert({
    where: { slug: 'pizzaria-italiana' },
    update: {},
    create: {
      name: 'Pizzaria Italiana',
      slug: 'pizzaria-italiana',
      niche: 'Alimentação/Restaurante',
      phone: '(62) 3232-3233',
      email: 'contato@pizzariaitaliana.com.br',
      address: 'Av. T-10, 789, St. Sul, Goiânia-GO',
      document: '23.456.789/0001-01',
      isActive: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        language: 'pt-BR',
      },
    },
  });

  console.log('✅ Companies created');

  // Create users for company 1
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const attendantPassword = await bcrypt.hash('attendant123', 10);

  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@bioanalise.com.br' },
    update: {},
    create: {
      email: 'admin@bioanalise.com.br',
      password: adminPassword,
      name: 'Kaleby Silva',
      role: 'ADMIN',
      companyId: company1.id,
      isActive: true,
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { email: 'gerente@bioanalise.com.br' },
    update: {},
    create: {
      email: 'gerente@bioanalise.com.br',
      password: managerPassword,
      name: 'Adriana Costa',
      role: 'MANAGER',
      companyId: company1.id,
      isActive: true,
    },
  });

  const attendant1 = await prisma.user.upsert({
    where: { email: 'atendente@bioanalise.com.br' },
    update: {},
    create: {
      email: 'atendente@bioanalise.com.br',
      password: attendantPassword,
      name: 'Cida Oliveira',
      role: 'ATTENDANT',
      companyId: company1.id,
      isActive: true,
    },
  });

  console.log('✅ Users created');

  // Create customers for company 1
  const customers = [
    { name: 'Maria Silva', phone: '5562999998888', email: 'maria.silva@email.com', city: 'Goiânia', state: 'GO' },
    { name: 'João Santos', phone: '5562988887777', email: 'joao.silva@email.com', city: 'Anápolis', state: 'GO' },
    { name: 'Ana Oliveira', phone: '5562977776666', email: 'ana.oliveira@email.com', city: 'Goiânia', state: 'GO' },
    { name: 'Carlos Lima', phone: '5562966665555', email: 'carlos.lima@email.com', city: 'Aparecida de Goiânia', state: 'GO' },
    { name: 'Paula Souza', phone: '5562955554444', email: 'paula.souza@email.com', city: 'Goiânia', state: 'GO' },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { 
        companyId_phone: { 
          companyId: company1.id, 
          phone: customer.phone 
        } 
      },
      update: {},
      create: {
        ...customer,
        companyId: company1.id,
        isActive: true,
      },
    });
  }

  console.log('✅ Customers created');

  // Create services for company 1
  const services: any[] = [
    { name: 'Hemograma Completo', category: 'Exames', type: 'SERVICE', price: 35.00, isActive: true },
    { name: 'Glicemia', category: 'Exames', type: 'SERVICE', price: 15.00, isActive: true },
    { name: 'TSH', category: 'Exames', type: 'SERVICE', price: 45.00, isActive: true },
    { name: 'Colesterol Total', category: 'Exames', type: 'SERVICE', price: 20.00, isActive: true },
    { name: 'Coleta em Domicílio', category: 'Serviços', type: 'SERVICE', price: 25.00, isActive: true },
    { name: 'Exame de Urina (EAS)', category: 'Exames', type: 'SERVICE', price: 25.00, isActive: true },
    { name: 'Ferro Sérico', category: 'Exames', type: 'SERVICE', price: 35.00, isActive: true },
    { name: 'Vitamina D', category: 'Exames', type: 'SERVICE', price: 85.00, isActive: true },
  ];

  for (const service of services) {
    await prisma.service.create({
      data: {
        ...service,
        companyId: company1.id,
      },
    });
  }

  console.log('✅ Services created');

  // Create tags for company 1
  const tags = [
    { name: 'Urgente', color: '#EF4444' },
    { name: 'VIP', color: '#F59E0B' },
    { name: 'Retorno', color: '#3B82F6' },
    { name: 'Novo Cliente', color: '#10B981' },
    { name: 'Exame Especial', color: '#8B5CF6' },
  ];

  for (const tag of tags) {
    await prisma.tag.create({
      data: {
        ...tag,
        companyId: company1.id,
      },
    });
  }

  console.log('✅ Tags created');

  // Create sample tickets
  const allCustomers = await prisma.customer.findMany({
    where: { companyId: company1.id },
  });

  if (allCustomers.length > 0) {
    for (let i = 0; i < 5; i++) {
      const ticketNumber = `TKT-${String(i + 1).padStart(3, '0')}`;
      
      await prisma.ticket.upsert({
        where: { companyId_ticketNumber: { companyId: company1.id, ticketNumber } },
        update: {},
        create: {
          ticketNumber,
          title: `Atendimento ${i + 1} - ${allCustomers[i % allCustomers.length].name}`,
          description: 'Atendimento de exemplo criado via seed',
          status: i < 2 ? 'OPEN' : i < 4 ? 'IN_PROGRESS' : 'RESOLVED',
          priority: i === 0 ? 'HIGH' : i === 3 ? 'URGENT' : 'MEDIUM',
          customerId: allCustomers[i % allCustomers.length].id,
          assignedToId: i % 2 === 0 ? admin1.id : attendant1.id,
          companyId: company1.id,
          tags: [tags[i % tags.length].name],
        },
      });
    }
  }

  console.log('✅ Sample tickets created');

  console.log('');
  console.log('🎉 Seed completed!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('');
  console.log('  Company: Bio Análise Laboratório (bio-analise)');
  console.log('  Admin:   admin@bioanalise.com.br / admin123');
  console.log('  Manager: gerente@bioanalise.com.br / manager123');
  console.log('  Attendant: atendente@bioanalise.com.br / attendant123');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });