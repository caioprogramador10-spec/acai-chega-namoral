-- ============================================================
-- SISTEMA AÇAÍ - SCHEMA SUPABASE
-- Cole este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Painel Supabase > SQL Editor > New query > colar > Run)
-- ============================================================

-- extensão para gerar uuid
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- FUNCIONÁRIOS (usado para identificar quem fez a venda/movimentação
-- em um sistema multi-caixa, sem precisar de login com senha)
-- ------------------------------------------------------------
create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MATERIAIS (estoque físico: copos, tampas, granola, calda, etc.)
-- ------------------------------------------------------------
create table if not exists materiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'Geral',
  unidade text not null default 'un',
  qtd_atual numeric(12,2) not null default 0,
  estoque_minimo numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MOVIMENTAÇÕES DE ESTOQUE (histórico de entradas/saídas manuais
-- + saídas automáticas geradas por vendas no PDV)
-- ------------------------------------------------------------
create table if not exists movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references materiais(id) on delete set null,
  material_nome text,
  tipo text not null check (tipo in ('entrada','saida')),
  qtd numeric(12,2) not null,
  funcionario_id uuid references funcionarios(id) on delete set null,
  funcionario_nome text,
  observacao text,
  venda_id uuid,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PRODUTOS DE VENDA (o que aparece nos botões do PDV: tamanhos de
-- açaí e complementos avulsos, cada um com um preço)
-- ------------------------------------------------------------
create table if not exists produtos_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('acai','complemento')),
  preco numeric(10,2) not null default 0,
  icone text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- se a tabela já existia (instalação anterior), garante a coluna nova:
alter table produtos_venda add column if not exists icone text;

-- ------------------------------------------------------------
-- FICHA TÉCNICA (o que cada produto de venda consome do estoque
-- de materiais quando é vendido) — opcional por produto
-- ------------------------------------------------------------
create table if not exists produto_insumos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos_venda(id) on delete cascade,
  material_id uuid not null references materiais(id) on delete cascade,
  qtd_consumida numeric(12,2) not null default 1,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CLIENTES (opcional, nome + whatsapp + data da última compra)
-- ------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text,
  ultima_compra_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- VENDAS (uma venda = um pedido fechado no PDV)
-- ------------------------------------------------------------
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nome text,
  funcionario_id uuid references funcionarios(id) on delete set null,
  funcionario_nome text,
  total numeric(10,2) not null default 0,
  forma_pagamento text default 'Não informado',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ITENS DE CADA VENDA
-- ------------------------------------------------------------
create table if not exists venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id) on delete cascade,
  produto_id uuid references produtos_venda(id) on delete set null,
  produto_nome text not null,
  categoria text,
  qtd numeric(10,2) not null default 1,
  preco_unit numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0
);

-- ------------------------------------------------------------
-- FINANCEIRO (entradas e saídas de dinheiro do caixa; vendas do
-- PDV geram uma entrada automática aqui)
-- ------------------------------------------------------------
create table if not exists financeiro (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric(10,2) not null,
  descricao text,
  categoria text default 'Geral',
  venda_id uuid references vendas(id) on delete set null,
  funcionario_id uuid references funcionarios(id) on delete set null,
  funcionario_nome text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ÍNDICES úteis
-- ------------------------------------------------------------
create index if not exists idx_mov_material on movimentacoes_estoque(material_id);
create index if not exists idx_mov_created on movimentacoes_estoque(created_at desc);
create index if not exists idx_venda_itens_venda on venda_itens(venda_id);
create index if not exists idx_vendas_created on vendas(created_at desc);
create index if not exists idx_financeiro_created on financeiro(created_at desc);
create index if not exists idx_clientes_ultima_compra on clientes(ultima_compra_at);

-- ============================================================
-- SEGURANÇA (RLS)
-- Este app não usa login com senha (multi-caixa simples via seletor
-- de funcionário). Por isso liberamos acesso total à chave "anon".
-- IMPORTANTE: isso significa que qualquer pessoa com a URL + chave
-- anon do seu projeto consegue ler/alterar os dados. Para uso interno
-- de uma loja pequena isso costuma ser aceitável, mas se quiser mais
-- segurança no futuro, troque estas policies por regras que exigem
-- Supabase Auth.
-- ============================================================
alter table funcionarios enable row level security;
alter table materiais enable row level security;
alter table movimentacoes_estoque enable row level security;
alter table produtos_venda enable row level security;
alter table produto_insumos enable row level security;
alter table clientes enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table financeiro enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'funcionarios','materiais','movimentacoes_estoque','produtos_venda',
    'produto_insumos','clientes','vendas','venda_itens','financeiro'
  ])
  loop
    execute format('drop policy if exists "acesso_total_%1$s" on %1$s;', t);
    execute format(
      'create policy "acesso_total_%1$s" on %1$s for all using (true) with check (true);', t
    );
  end loop;
end $$;

-- ============================================================
-- DADOS DE EXEMPLO (pode apagar depois, é só pra começar com algo)
-- ============================================================
insert into funcionarios (nome) values ('Administrador') on conflict do nothing;

insert into materiais (nome, categoria, unidade, qtd_atual, estoque_minimo) values
  ('Copo 300ml', 'Embalagem', 'un', 100, 20),
  ('Copo 500ml', 'Embalagem', 'un', 100, 20),
  ('Copo 700ml', 'Embalagem', 'un', 60, 15),
  ('Tampa', 'Embalagem', 'un', 150, 30),
  ('Colher descartável', 'Embalagem', 'un', 200, 40),
  ('Polpa de açaí', 'Matéria-prima', 'kg', 20, 5),
  ('Granola', 'Complemento', 'kg', 5, 1),
  ('Leite em pó', 'Complemento', 'kg', 3, 1),
  ('Morango', 'Complemento', 'kg', 4, 1),
  ('Leite condensado', 'Complemento', 'l', 4, 1)
on conflict do nothing;

insert into produtos_venda (nome, categoria, preco, ordem) values
  ('Açaí 300ml', 'acai', 10.00, 1),
  ('Açaí 500ml', 'acai', 15.00, 2),
  ('Açaí 700ml', 'acai', 20.00, 3),
  ('Granola', 'complemento', 2.00, 10),
  ('Leite em pó', 'complemento', 2.00, 11),
  ('Morango', 'complemento', 3.00, 12),
  ('Leite condensado', 'complemento', 2.00, 13)
on conflict do nothing;
