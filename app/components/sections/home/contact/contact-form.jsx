"use client";
// @flow strict
import { isValidEmail } from "@/lib/validators/email";
import axios from "axios";
import { useState } from "react";
import { TbMailForward } from "react-icons/tb";
import { toast } from "react-toastify";

const INITIAL_INPUT = { name: "", email: "", message: "", website: "" };

function ContactForm() {
  const [error, setError] = useState({ email: false, required: false });
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState(INITIAL_INPUT);

  const checkRequired = () => {
    if (userInput.email && userInput.message && userInput.name) {
      setError((prev) => ({ ...prev, required: false }));
    }
  };

  const handleSendMail = async (e) => {
    e.preventDefault();

    const { name, email, message, website } = userInput;
    const emailValid = isValidEmail(email);

    if (!name || !email || !message) {
      setError({ email: !emailValid && Boolean(email), required: true });
      return;
    }
    if (!emailValid) {
      setError({ email: true, required: false });
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post("/api/contact", { name, email, message, website });

      if (data?.success) {
        toast.success("Message sent — thanks for reaching out! I'll get back to you soon.");
        setUserInput(INITIAL_INPUT);
        setError({ email: false, required: false });
      } else {
        toast.error(data?.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      const message = err?.response?.data?.message || "Something went wrong. Please try again or email me directly.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p className="font-medium mb-5 text-[#16f2b3] text-xl uppercase">Contact with me</p>
      <div className="max-w-3xl text-white rounded-lg border border-[#464c6a] p-3 lg:p-5">
        <p className="text-sm text-[#d3d8e8]">{"If you have any questions or concerns, please don't hesitate to contact me. I am open to any work opportunities that align with my skills and interests."}</p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSendMail}>
          {/* Honeypot field: hidden from real users, catches simple bots that fill every input. */}
          <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={userInput.website}
              onChange={(e) => setUserInput({ ...userInput, website: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base" htmlFor="contact-name">Your Name: </label>
            <input
              id="contact-name"
              className="bg-[#10172d] w-full border rounded-md border-[#353a52] focus:border-[#16f2b3] ring-0 outline-0 transition-all duration-300 px-3 py-2"
              type="text"
              maxLength="100"
              required={true}
              onChange={(e) => setUserInput({ ...userInput, name: e.target.value })}
              onBlur={checkRequired}
              value={userInput.name}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base" htmlFor="contact-email">Your Email: </label>
            <input
              id="contact-email"
              className="bg-[#10172d] w-full border rounded-md border-[#353a52] focus:border-[#16f2b3] ring-0 outline-0 transition-all duration-300 px-3 py-2"
              type="email"
              maxLength="100"
              required={true}
              value={userInput.email}
              onChange={(e) => setUserInput({ ...userInput, email: e.target.value })}
              onBlur={() => {
                checkRequired();
                setError((prev) => ({ ...prev, email: !isValidEmail(userInput.email) }));
              }}
            />
            {error.email && <p className="text-sm text-red-400">Please provide a valid email!</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base" htmlFor="contact-message">Your Message: </label>
            <textarea
              id="contact-message"
              className="bg-[#10172d] w-full border rounded-md border-[#353a52] focus:border-[#16f2b3] ring-0 outline-0 transition-all duration-300 px-3 py-2"
              maxLength="500"
              name="message"
              required={true}
              onChange={(e) => setUserInput({ ...userInput, message: e.target.value })}
              onBlur={checkRequired}
              rows="4"
              value={userInput.message}
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            {error.required && <p className="text-sm text-red-400">
              All fields are required!
            </p>}
            <button
              className="flex items-center gap-1 hover:gap-3 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 px-5 md:px-12 py-2.5 md:py-3 text-center text-xs md:text-sm font-medium uppercase tracking-wider text-white no-underline transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed"
              role="button"
              type="submit"
              disabled={isLoading}
            >
              <span className="flex items-center gap-1">
                {isLoading ? "Sending..." : "Send Message"}
                {!isLoading && <TbMailForward size={16} />}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContactForm;
