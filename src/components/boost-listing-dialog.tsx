"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Smartphone,
  Phone,
  Clock,
  Zap,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FEATURED_DURATION_OPTIONS,
  formatFeaturedPrice,
} from "@/lib/featured-pricing";
import { toast } from "sonner";

interface BoostListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The listing to boost */
  listingId: string;
  listingTitle: string;
  /** Callback after successful payment */
  onSuccess?: () => void;
}

type PaymentStep = "select" | "phone" | "processing" | "waiting" | "success" | "error" | "timeout";

const POLL_INTERVAL = 3000;
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("7") || digits.startsWith("1")) {
    return `+254${digits}`;
  }
  return phone;
}

function isValidPhoneInput(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return (
    /^0[17]\d{8}$/.test(digits) ||
    /^254[17]\d{8}$/.test(digits) ||
    /^[17]\d{8}$/.test(digits)
  );
}

export default function BoostListingDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  onSuccess,
}: BoostListingDialogProps) {
  const [step, setStep] = useState<PaymentStep>("select");
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [, setTick] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedDays(30);
      setPhoneNumber("");
      setPhoneError("");
      setSubmitting(false);
      setPaymentId(null);
      setErrorMessage("");
      startTimeRef.current = 0;
    }
  }, [open]);

  // Cleanup polling on unmount
  const cleanupPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupPolling();
  }, [cleanupPolling]);

  // Re-render elapsed time while waiting
  useEffect(() => {
    if (step === "waiting") {
      const interval = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const pollPaymentStatus = useCallback(
    async (pid: string) => {
      try {
        const res = await fetch(`/api/employer/payments/${pid}/status`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "COMPLETED") {
          cleanupPolling();
          setStep("success");
          toast.success("Featured boost activated!");
          onSuccess?.();
          return;
        }

        if (data.status === "FAILED" || data.status === "CANCELLED") {
          cleanupPolling();
          setStep("error");
          setErrorMessage("Payment was not completed.");
          return;
        }
      } catch {
        // Silently retry on network errors
      }
    },
    [cleanupPolling, onSuccess]
  );

  const startPolling = useCallback(
    (pid: string) => {
      startTimeRef.current = Date.now();

      pollingRef.current = setInterval(() => {
        pollPaymentStatus(pid);
      }, POLL_INTERVAL);

      pollPaymentStatus(pid);

      timeoutRef.current = setTimeout(() => {
        cleanupPolling();
        setStep("timeout");
      }, TIMEOUT_MS);
    },
    [cleanupPolling, pollPaymentStatus]
  );

  const handleSubmit = async () => {
    // Validate phone
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!isValidPhoneInput(trimmed)) {
      setPhoneError("Enter a valid phone number (e.g., 0712345678 or 254712345678)");
      return;
    }

    setPhoneError("");
    setSubmitting(true);
    setStep("processing");

    try {
      const res = await fetch("/api/employer/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          durationDays: selectedDays,
          phoneNumber: trimmed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to initiate boost");
      }

      const data = await res.json();

      if (data.paymentId) {
        setPaymentId(data.paymentId);
        setStep("waiting");
        startPolling(data.paymentId);
      } else {
        throw new Error("No payment ID returned");
      }
    } catch (err) {
      setStep("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to initiate boost"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    cleanupPolling();
    onOpenChange(false);
  };

  const selectedOption = FEATURED_DURATION_OPTIONS.find(
    (o) => o.days === selectedDays
  );
  const elapsed =
    startTimeRef.current > 0
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Step 1: Select Duration */}
        {step === "select" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-amber-100">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                Boost Your Listing
              </DialogTitle>
              <DialogDescription>
                Get extra visibility for your listing. Choose a duration below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Listing name */}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">Listing</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {listingTitle}
                </p>
              </div>

              {/* Duration options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Duration</Label>
                <div className="grid gap-2">
                  {FEATURED_DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => setSelectedDays(option.days)}
                      className={`relative flex items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${
                        selectedDays === option.days
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                            selectedDays === option.days
                              ? "border-amber-500 bg-amber-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedDays === option.days && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {option.label}
                          </p>
                          {option.popular && (
                            <span className="inline-block text-xs text-amber-700 font-medium">
                              Most Popular
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {formatFeaturedPrice(option.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("phone")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Phone Number Input */}
        {step === "phone" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-green-100">
                  <Smartphone className="h-5 w-5 text-green-700" />
                </div>
                Pay with M-Pesa
              </DialogTitle>
              <DialogDescription>
                Complete your featured boost purchase using M-Pesa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Order Summary */}
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Item</span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]">
                    {listingTitle}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">
                    {selectedOption?.label}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-gray-600 font-medium">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedOption
                      ? formatFeaturedPrice(selectedOption.price)
                      : ""}
                  </span>
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="boost-phone" className="text-sm font-medium">
                  M-Pesa Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="boost-phone"
                    type="tel"
                    placeholder="0712345678"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneError("");
                    }}
                    className="pl-10"
                    disabled={submitting}
                    autoComplete="tel"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Enter your M-Pesa phone number (format: 07XXXXXXXX)
                </p>
                {phoneError && (
                  <p className="text-xs text-red-600">{phoneError}</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !phoneNumber.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Pay{" "}
                    {selectedOption
                      ? formatFeaturedPrice(selectedOption.price)
                      : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Processing / STK Push Initiation */}
        {step === "processing" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                Initiating Payment
              </DialogTitle>
              <DialogDescription>
                Sending STK push request to M-Pesa...
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="rounded-full bg-green-100 p-4">
                <Smartphone className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Please wait while we connect to M-Pesa...
              </p>
            </div>
          </>
        )}

        {/* Step 4: Waiting for Payment (Polling) */}
        {step === "waiting" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-1.5">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                Waiting for Payment
              </DialogTitle>
              <DialogDescription>
                {phoneNumber && (
                  <span>
                    STK push sent to{" "}
                    <strong>{formatPhoneDisplay(phoneNumber)}</strong>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-6 space-y-5">
              <div className="relative">
                <div className="rounded-full bg-green-100 p-4">
                  <Smartphone className="h-8 w-8 text-green-600" />
                </div>
                <div className="absolute -top-1 -right-1 rounded-full bg-green-500 p-1">
                  <Loader2 className="h-3 w-3 text-white animate-spin" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="font-medium text-gray-900">
                  Enter your M-Pesa PIN to complete
                </p>
                <p className="text-sm text-gray-500">
                  Check your phone for the STK push notification and enter your
                  PIN.
                </p>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>
                  Waiting... ({Math.floor(elapsed / 60)}:
                  {(elapsed % 60).toString().padStart(2, "0")})
                </span>
              </div>

              {/* Amount reminder */}
              <div className="text-xs text-gray-400">
                Amount:{" "}
                {selectedOption
                  ? formatFeaturedPrice(selectedOption.price)
                  : ""}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  cleanupPolling();
                  setStep("phone");
                  setPaymentId(null);
                }}
              >
                Change Phone Number
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 5a: Success */}
        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-1.5">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                Boost Activated!
              </DialogTitle>
              <DialogDescription>
                Your listing is now featured and will receive extra visibility.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="rounded-full bg-amber-100 p-4">
                <Star className="h-8 w-8 text-amber-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-gray-900">{listingTitle}</p>
                <p className="text-sm text-gray-500">
                  {selectedOption?.label} — Featured
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {selectedOption
                    ? formatFeaturedPrice(selectedOption.price)
                    : ""}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleClose}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 5b: Error */}
        {step === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-full bg-red-100 p-1.5">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                Payment Failed
              </DialogTitle>
              <DialogDescription>
                {errorMessage || "We could not process your payment."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Please try again or contact support if the issue persists.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setStep("phone");
                  setPaymentId(null);
                  setErrorMessage("");
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 5c: Timeout */}
        {step === "timeout" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-full bg-orange-100 p-1.5">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                Payment Timed Out
              </DialogTitle>
              <DialogDescription>
                We didn&apos;t receive a payment confirmation within 2 minutes.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="rounded-full bg-orange-100 p-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                The payment may still be processing. Check your Payment History
                for updates.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setStep("phone");
                  setPaymentId(null);
                  setErrorMessage("");
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
