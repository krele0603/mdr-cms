import { query } from '@/lib/db'

export const BUILTIN_VARIABLES = [
  { tag: '$device_name',          label: 'Device name' },
  { tag: '$manufacturer_name',    label: 'Manufacturer name' },
  { tag: '$manufacturer_address', label: 'Manufacturer address' },
  { tag: '$manufacturer_contact', label: 'Manufacturer contact' },
  { tag: '$manufacturer_email',   label: 'Manufacturer email' },
  { tag: '$intended_use',         label: 'Intended use' },
  { tag: '$device_description',   label: 'Device description' },
  { tag: '$classification',       label: 'Device classification' },
  { tag: '$basic_udi',            label: 'Basic UDI-DI' },
  { tag: '$notified_body',        label: 'Notified body' },
]

export async function seedVariables(projectId: string) {
  for (const v of BUILTIN_VARIABLES) {
    await query(`
      INSERT INTO project_variables (project_id, tag, name, value, status)
      VALUES ($1::uuid, $2, $3, '', 'draft')
      ON CONFLICT (project_id, tag) DO NOTHING
    `, [projectId, v.tag, v.label])
  }
}
