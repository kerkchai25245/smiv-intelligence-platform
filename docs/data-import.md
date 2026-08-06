# Excel data import

Only `.xlsx` workbooks up to 10 MB are accepted as the raw request body, with the original filename in the `X-Filename` header. The first worksheet and first row are used. Required columns are `national_id` (or `เลขบัตรประชาชน`), `first_name`/`ชื่อ`, and `last_name`/`นามสกุล`.

Supported analytical fields are `date_of_birth`, `gender`, `province`, `district`, `subdistrict`, `latitude`, `longitude`, and `v1` through `v4`. Thai aliases are accepted for geographic and demographic fields. Additional columns are retained in `extra_data`.

Existing records are matched using a keyed HMAC of the 13-digit Thai national ID. Plain national IDs are never stored. Every update saves the previous record in `patient_versions`; imports and edits create audit events.

Roles:

- `viewer`: search, dashboard, map, and history
- `editor`: viewer permissions plus import and edit
- `admin`: all permissions plus audit access and user administration
