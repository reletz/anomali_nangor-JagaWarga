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
        |> json(%{error: reason})
        |> halt()
    end
  end

  defp get_token_from_header(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> {:error, "Missing or invalid Authorization header"}
    end
  end

  defp validate_token(token) do
    url = ~c"#{@identity_service_url}/validate"
    headers = [{~c"content-type", ~c"application/json"}]
    body = Jason.encode!(%{token: token})

    :inets.start()

    case :httpc.request(:post, {url, headers, ~c"application/json", body}, [], []) do
      {:ok, {{_version, 200, _reason}, _headers, response_body}} ->
        response_string = List.to_string(response_body)

        case Jason.decode(response_string) do
          {:ok, %{"valid" => true, "user" => user_data}} ->
            department = Map.get(user_data, "department")
            email = Map.get(user_data, "email")
            user_id = Map.get(user_data, "id")

            {:ok,
              %{
                "department" => department,
                "email" => email,
                "id" => user_id
              }}

          {:ok, %{"valid" => false}} ->
            {:error, "Invalid token"}

          {:ok, unexpected} ->
            Logger.error("Unexpected token response format: #{inspect(unexpected)}")
            {:error, "Invalid token response format"}

          {:error, decode_error} ->
            Logger.error("Failed to decode token response: #{inspect(decode_error)}")
            {:error, "Invalid token response format"}
        end

      {:ok, {{_version, status_code, _reason}, _headers, _body}} ->
        Logger.error("Identity service returned status #{status_code}")
        {:error, "Token validation failed"}

      {:error, reason} ->
        Logger.error("Failed to connect to identity service: #{inspect(reason)}")
        {:error, "Token validation service unavailable"}
    end
  end
end
