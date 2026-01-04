defmodule ReportWeb.Plugs.AuthPlug do
  import Plug.Conn
  import Phoenix.Controller
  require Logger

  @identity_service_url "http://identity-service:3001"

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- get_token_from_header(conn),
         {:ok, user} <- validate_token(token) do
      assign(conn, :current_user, user)
    else
      {:error, reason} ->
        Logger.warning("Authentication failed: #{reason}")

        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Unauthorized", message: reason})
        |> halt()
    end
  end

  defp get_token_from_header(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      [token] -> {:ok, token}
      _ -> {:error, "Missing or invalid Authorization header"}
    end
  end

  defp validate_token(token) do
    url = "#{@identity_service_url}/validate"
    headers = [{"Authorization", "Bearer #{token}"}, {"Content-Type", "application/json"}]

    case :httpc.request(:get, {String.to_charlist(url), headers}, [], [body_format: :binary]) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        case Jason.decode(body) do
          {:ok, %{"user" => user}} -> {:ok, user}
          {:ok, response} -> {:error, "Invalid response format: #{inspect(response)}"}
          {:error, _} -> {:error, "Failed to decode response"}
        end

      {:ok, {{_, status, _}, _headers, body}} ->
        Logger.warning("Identity service returned #{status}: #{body}")
        {:error, "Invalid or expired token"}

      {:error, reason} ->
        Logger.error("Failed to reach identity service: #{inspect(reason)}")
        {:error, "Authentication service unavailable"}
    end
  rescue
    error ->
      Logger.error("Exception during token validation: #{inspect(error)}")
      {:error, "Internal authentication error"}
  end
end
