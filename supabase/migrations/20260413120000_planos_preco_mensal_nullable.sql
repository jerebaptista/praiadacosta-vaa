-- Permite plano sem oferta de cobrança mensal (só trimestral / semestral / anual).

alter table public.planos
  alter column preco_mensal drop not null;

alter table public.planos
  alter column preco_mensal drop default;
