CREATE TABLE usersession (
	id uuid NOT NULL,
	statechainid uuid NULL,
	authentication varchar NULL,
	s2 varchar NULL,
	s1pubkey varchar NULL,
	sighash varchar NULL,
	withdrawscsig varchar NULL,
	txwithdraw varchar NULL,
	proofkey varchar NULL,
	txbackup varchar NULL,
	masterpublic varchar NULL,
	sharedpublic varchar NULL,
	challenge varchar NULL,
	CONSTRAINT usersession_pkey PRIMARY KEY (id)
);