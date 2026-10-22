import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminLoginPage from "./AdminLoginPage";

const mockNavigate = jest.fn();
const mockFetchUser = jest.fn(async () => {});
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../Context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false, fetchUser: mockFetchUser }) }));

const answerWith = (payload) => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => payload }));
};
const sendOtpFor = (number) => {
  fireEvent.change(screen.getByLabelText("Admin mobile number"), { target: { value: number } });
  fireEvent.click(screen.getByRole("button", { name: /send otp/i }));
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

test("direct login: an admin number opens the admin console with no code step", async () => {
  answerWith({ channel: "direct", message: "Login successful", accessToken: "admin-token", user: { role: "admin" } });
  render(<AdminLoginPage />);
  sendOtpFor("9123456789");

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/Landingpage", { replace: true }));
  expect(localStorage.getItem("accessToken")).toBe("admin-token");
  expect(mockFetchUser).toHaveBeenCalled();
  expect(screen.queryByLabelText("OTP")).not.toBeInTheDocument();
  expect(global.fetch.mock.calls[0][0]).toMatch(/\/admin\/login\/request-otp$/); // its own endpoint, not /login
});

test("direct login never keeps a session that is not an admin's", async () => {
  answerWith({ channel: "direct", message: "Login successful", accessToken: "t", user: { role: "renter" } });
  render(<AdminLoginPage />);
  sendOtpFor("9123456789");

  expect(await screen.findByText(/does not have admin access/i)).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(localStorage.getItem("accessToken")).toBeNull();
});

test("normal SMS flow: shows the OTP box", async () => {
  answerWith({ channel: "sms", message: "OTP sent to your mobile number" });
  render(<AdminLoginPage />);
  sendOtpFor("9123456789");

  expect(await screen.findByLabelText("OTP")).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});
