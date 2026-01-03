defmodule Report.Report do
    use Ecto.Schema
    import Ecto.Changeset

    @primary_key {:id, :binary_id, autogenerate: true}
    @foreign_key_type :binary_id

    schema "reports" do
        field   :reporter_id, :binary_id
        field   :privacy_level, :string
        field   :category, :string
        field   :content, :string
        field   :location, :string
        field   :status, :string, default: "submitted"
        field   :authority_department, :string
        field   :escalated_at, :utc_datetime
        field   :resolved_at, :utc_datetime

        timestamps(inserted_at: :created_at, type: :utc_datetime)
    end

    @doc false
    def changeset(report, attrs) do
        report
        |> cast(attrs, [:reporter_id, :privacy_level, :category, :content, :location, :status, :authority_department, :escalated_at, :resolved_at])
        |> validate_required([:privacy_level, :category, :content, :status])
        |> validate_inclusion(:privacy_level, ["public", "private", "anonymous"])
        |> validate_inclusion(:status, ["submitted", "in_progress", "resolved", "escalated"])
    end
end


