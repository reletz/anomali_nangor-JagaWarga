defmodule Report.Release do
  @moduledoc "Database migrations for a release, executed by a GitOps hook Job."

  def migrate do
    Application.load(:report)

    for repo <- Application.fetch_env!(:report, :ecto_repos) do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end
end
