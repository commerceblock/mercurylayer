CREATE TABLE public.key_data (
	id serial4 NOT NULL,
	token_id varchar NULL UNIQUE,
    auth_xonly_public_key bytea NULL UNIQUE,
	server_public_nonce bytea NULL,
	server_public_key bytea NULL UNIQUE,
    amount bigint NULL,
    statechain_id varchar NULL UNIQUE,
	r2_commitment varchar NULL,
	blind_commitment varchar NULL,
	CONSTRAINT key_data_pkey PRIMARY KEY (id),
	CONSTRAINT key_data_server_public_key_ukey UNIQUE (server_public_key)
);