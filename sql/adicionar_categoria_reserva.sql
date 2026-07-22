alter table categorias
add column if not exists is_reserva boolean not null default false;
