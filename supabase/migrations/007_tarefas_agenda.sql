-- ============ 007: tarefas como agenda ============
-- Adiciona hora, frequência e "quantas vezes" à tabela tarefas,
-- para o usuário usar tarefas como uma agenda (data + hora + recorrência).
--
-- Aplicar manualmente no Supabase Dashboard (SQL Editor).

alter table tarefas add column if not exists hora text;
alter table tarefas add column if not exists frequencia text default 'uma_vez';
alter table tarefas add column if not exists vezes integer;
