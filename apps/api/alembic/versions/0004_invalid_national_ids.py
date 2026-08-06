"""retain patients whose national id needs correction"""

from alembic import op
import sqlalchemy as sa

revision = "0004_invalid_national_ids"
down_revision = "0003_import_issues"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("patients")}
    if "national_id_valid" not in columns:
        op.add_column("patients", sa.Column("national_id_valid", sa.Boolean(), nullable=False, server_default=sa.true()))
        op.create_index("ix_patients_national_id_valid", "patients", ["national_id_valid"])
    if "national_id_invalid_value" not in columns:
        op.add_column("patients", sa.Column("national_id_invalid_value", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "national_id_invalid_value")
    op.drop_index("ix_patients_national_id_valid", table_name="patients")
    op.drop_column("patients", "national_id_valid")
