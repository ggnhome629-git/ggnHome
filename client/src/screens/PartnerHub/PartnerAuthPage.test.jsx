import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PartnerAuthPage from "./PartnerAuthPage";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: "/partner/login" }) }));

const answerWith = (payload) => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => payload }));
};
const sendOtpFor = (number) => {
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: number } });
  fireEvent.click(screen.getByRole("button", { name: /send otp/i }));
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

test("direct login: an active partner opens the dashboard with no code step", async () => {
  answerWith({ channel: "direct", message: "Login successful", accessToken: "user-token", agentAccessToken: "partner-token", agent: { role: "Partner", status: "active" } });
  render(<PartnerAuthPage />);
  sendOtpFor("9555555555");

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/partner/dashboard", { replace: true }));
  expect(localStorage.getItem("partnerAccessToken")).toBe("partner-token");
  expect(screen.queryByLabelText("OTP")).not.toBeInTheDocument();
  expect(global.fetch.mock.calls[0][0]).toMatch(/\/partner\/login\/request-otp$/);
});

test("direct login is refused for a suspended partner", async () => {
  answerWith({ channel: "direct", message: "Login successful", accessToken: "t", agentAccessToken: "p", agent: { role: "Partner", status: "suspended" } });
  render(<PartnerAuthPage />);
  sendOtpFor("9555555555");

  expect(await screen.findByText(/suspended/i)).toBeInTheDocument();
  expect(localStorage.getItem("partnerAccessToken")).toBeNull();
});

test("normal SMS flow: shows the OTP box", async () => {
  answerWith({ channel: "sms", message: "OTP sent to your mobile number" });
  render(<PartnerAuthPage />);
  sendOtpFor("9555555555");

  expect(await screen.findByLabelText("OTP")).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});
