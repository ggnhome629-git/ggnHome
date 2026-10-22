import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MobileOtpForm from "./MobileOtpForm";

// The server answers /login/request-otp with channel "direct" (already signed in, no code sent)
// or channel "sms" (a code was sent). A direct answer used to be missed, so the page showed
// "We sent a 4-letter code" although no code existed.
const directPayload = { channel: "direct", message: "Login successful", accessToken: "a", user: { role: "renter" } };
const smsPayload = { channel: "sms", message: "OTP sent to your mobile number", maskedMobile: "98*****210" };

const answerWith = (payload) => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => payload }));
};
const sendCodeFor = (number) => {
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: number } });
  fireEvent.click(screen.getByRole("button", { name: /send code/i }));
};

test("direct login: signs in from the number and never shows the code step", async () => {
  answerWith(directPayload);
  const onVerified = jest.fn();
  render(<MobileOtpForm onVerified={onVerified} />);
  sendCodeFor("9876543210");

  await waitFor(() => expect(onVerified).toHaveBeenCalledWith(directPayload, "9876543210"));
  expect(screen.queryByText(/4-letter code to/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText("4-letter code")).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1); // only the request, no verify call
});

test("normal SMS flow: shows the code step and waits for the code", async () => {
  answerWith(smsPayload);
  const onVerified = jest.fn();
  render(<MobileOtpForm onVerified={onVerified} />);
  sendCodeFor("9876543210");

  expect(await screen.findByText(/We sent a 4-letter code to 98\*+210/)).toBeInTheDocument();
  expect(screen.getByLabelText("4-letter code")).toBeInTheDocument();
  expect(onVerified).not.toHaveBeenCalled();
});
