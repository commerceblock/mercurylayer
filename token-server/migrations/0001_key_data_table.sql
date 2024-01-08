CREATE TABLE public.tokens (
	id serial4 NOT NULL,
	token_id varchar NULL UNIQUE,
	invoice varchar NULL,
	onchain_address varchar NULL,
	processor_id varchar NULL,
	confirmed boolean DEFAULT false,
	spent boolean DEFAULT false
);