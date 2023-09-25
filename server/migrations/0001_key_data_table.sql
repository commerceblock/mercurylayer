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

CREATE TABLE public.statechain_transfer (
	id serial4 NOT NULL,
	statechain_id varchar,
	new_user_auth_public_key bytea,
	x1 bytea,
	encrypted_transfer_msg varchar NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT transfer_pkey PRIMARY KEY (id)
);