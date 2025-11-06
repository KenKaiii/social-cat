-- Make organization_id nullable for admin workflows
-- Admin workflows (NULL organization_id) are global and not tied to any client

-- Drop the foreign key constraint
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_organization_id_fkey;

-- Make organization_id nullable
ALTER TABLE workflows ALTER COLUMN organization_id DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL
-- This ensures that if an organization is deleted, workflows are preserved as admin workflows
ALTER TABLE workflows 
ADD CONSTRAINT workflows_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON DELETE SET NULL;
