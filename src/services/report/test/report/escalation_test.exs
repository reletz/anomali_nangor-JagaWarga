defmodule Report.EscalationTest do
  use Report.DataCase
  @moduletag :db
  import Report.ReportsFixtures

  test "an old report snapshot cannot escalate the same report twice" do
    report = public_report_fixture(status: "submitted")
    assert {:ok, updated} = Report.Reports.escalate_report(report)
    assert updated.status == "escalated"
    assert {:error, :already_escalated} = Report.Reports.escalate_report(report)
  end
end
