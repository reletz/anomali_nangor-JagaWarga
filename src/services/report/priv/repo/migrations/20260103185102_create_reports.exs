defmodule Report.Repo.Migrations.CreateReports do
  use Ecto.Migration

  def change do
    create table(:reports, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reporter_id, :binary_id
      add :privacy_level, :string, null: false
      add :category, :string, null: false
      add :content, :text, null: false
      add :location, :string
      add :status, :string, null: false, default: "submitted"
      add :authority_department, :string
      add :escalated_at, :utc_datetime
      add :resolved_at, :utc_datetime

      timestamps(inserted_at: :created_at, type: :utc_datetime)
    end

    create index(:reports, [:authority_department, :status])

    create index(:reports, [:created_at, :status],
             where: "status = 'submitted'",
             name: :idx_reports_stale
           )

    create index(:reports, [:privacy_level],
             where: "privacy_level = 'public'",
             name: :idx_reports_privacy
           )
  end
end
