-- Make contact email required
ALTER TABLE contacts ALTER COLUMN email SET NOT NULL;

-- Make deal primary_contact_id required with RESTRICT delete
ALTER TABLE deals ALTER COLUMN primary_contact_id SET NOT NULL;
ALTER TABLE deals DROP CONSTRAINT deals_primary_contact_id_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_primary_contact_id_contacts_id_fk
  FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE RESTRICT;
