import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FaCamera,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationCircle,
  FaLock,
  FaPen,
  FaShieldAlt,
  FaTimes,
  FaUpload,
  FaUserCircle,
} from "react-icons/fa";
import API, { getBackendBaseURL } from "../api";
import { withAudit } from "../utils/auditAction";

const Profile = () => {
  const location = useLocation();
  const securitySectionRef = useRef(null);
  const fileInputRef = useRef(null);

  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("avatarUrl") || "",
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await API.get("/users/me");
        const d = res.data;
        if (cancelled) return;
        if (d.name) { setName(d.name); localStorage.setItem("name", d.name); }
        if (d.role) { setRole(d.role); localStorage.setItem("role", (d.role || "").toLowerCase()); }
        if (d.email) { setEmail(d.email); localStorage.setItem("email", d.email); }
        if (d.avatarUrl) {
          const full = d.avatarUrl.startsWith("http") ? d.avatarUrl : `${getBackendBaseURL()}${d.avatarUrl}`;
          setAvatarUrl(full);
          localStorage.setItem("avatarUrl", full);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Could not load profile.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (location.state?.focusSection !== "security") return;
    securitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.state]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    handleAvatarUpload(null, file);
  };

  const handleStartCamera = async () => {
    try {
      setCameraError("");
      setShowCamera(true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera support available nahi hai (browser permission).");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);

      const video = document.getElementById("profile-camera-video");
      if (video) {
        video.srcObject = stream;
        video.play();
      }
    } catch {
      setCameraError("Camera open nahi ho pa rahi. Permission allow karein.");
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    setCameraStream(null);
    setShowCamera(false);
    setCameraError("");
  };

  const handleCaptureFromCamera = () => {
    const video = document.getElementById("profile-camera-video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar-camera.jpg", { type: "image/jpeg" });
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(blob);
      setAvatarUrl(previewUrl);
      handleAvatarUpload(null, file);
    }, "image/jpeg");

    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    const videoEl = document.getElementById("profile-camera-video");
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setCameraStream(null);
    setShowCamera(false);
  };

  const handleAvatarUpload = async (e, fileOverride) => {
    if (e) e.preventDefault();
    const file = fileOverride || avatarFile;
    if (!file) return;

    try {
      setLoadingAvatar(true);
      setMessage("");
      setError("");

      const formData = new FormData();
      formData.append("avatar", file);
      if (email) {
        formData.append("email", email);
      }

      const res = await API.put(
        "/users/me/avatar",
        formData,
        withAudit("update_profile_avatar", {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      );

      let urlFromServer = res.data?.avatarUrl || res.data?.url || avatarUrl;
      if (urlFromServer && !urlFromServer.startsWith("http")) {
        urlFromServer = `${getBackendBaseURL()}${urlFromServer.startsWith("/") ? "" : "/"}${urlFromServer}`;
      }

      if (urlFromServer) {
        setAvatarUrl(urlFromServer);
        localStorage.setItem("avatarUrl", urlFromServer);
      }

      setMessage("Profile picture updated successfully.");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Image upload fail ho gaya. /users/me/avatar endpoint check karein.";
      setError(msg);
    } finally {
      setLoadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Saare password fields bharna zaroori hai.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password aur confirm password match nahi kar rahe.");
      return;
    }

    try {
      setLoadingPassword(true);
      await API.post(
        "/users/change-password",
        { email, currentPassword, newPassword },
        withAudit("change_password"),
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password successfully change ho gaya.");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Password change fail ho gaya.";
      setError(msg);
    } finally {
      setLoadingPassword(false);
    }
  };

  const prettyRole =
    role && typeof role === "string"
      ? role.charAt(0).toUpperCase() + role.slice(1)
      : "Role";

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-5 sm:p-7 lg:p-10">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">

        {/* ── Gradient header ──────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 px-7 py-8 shadow-[0_18px_45px_rgba(14,165,233,0.28)] sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white/80">
            <FaShieldAlt />
            <span>My Account</span>
          </div>
          <h1 className="relative mt-3 text-3xl font-black text-white sm:text-4xl">
            Personal Information
          </h1>
          <p className="relative mt-2 max-w-xl text-sm font-medium text-white/90 sm:text-base">
            Profile picture, contact details aur password ek jagah se manage karein.
          </p>
        </div>

        {/* ── Alerts ───────────────────────────────────────────── */}
        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            <FaExclamationCircle className="shrink-0 text-base" />
            <span>{error}</span>
          </div>
        ) : null}

        {message ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            <FaCheckCircle className="shrink-0 text-base" />
            <span>{message}</span>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">

          {/* ── Avatar card ──────────────────────────────────── */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">
              Profile Photo
            </p>

            <div className="mt-5 flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-4xl font-black text-white shadow-[0_14px_32px_rgba(14,165,233,0.32)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    (name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500">
                  <FaCheckCircle className="text-xs text-white" />
                </span>
              </div>

              <h2 className="mt-4 text-lg font-black text-slate-900">{name || "User"}</h2>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
                <FaUserCircle className="text-[10px]" />
                {prettyRole}
              </span>

              <div className="mt-6 flex w-full flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingAvatar}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaUpload className="text-xs" />
                  {loadingAvatar ? "Uploading..." : "Upload New Picture"}
                </button>
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600"
                >
                  <FaCamera className="text-xs" />
                  Use Camera
                </button>
              </div>
            </div>

            {showCamera ? (
              <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">Camera Preview</p>
                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Close camera"
                  >
                    <FaTimes />
                  </button>
                </div>

                {cameraError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {cameraError}
                  </div>
                ) : (
                  <>
                    <video
                      id="profile-camera-video"
                      className="w-full rounded-xl border border-slate-200 bg-slate-950/90"
                      autoPlay
                      muted
                    />
                    <button
                      type="button"
                      onClick={handleCaptureFromCamera}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] transition hover:bg-sky-600"
                    >
                      <FaCamera />
                      Capture Photo
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <div className="mt-7 space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FaUserCircle className="shrink-0 text-slate-400" />
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {name || "Name not set"}
                  </span>
                </div>
                <FaPen className="shrink-0 text-xs text-slate-300" />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FaEnvelope className="shrink-0 text-slate-400" />
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {email || "Email not set"}
                  </span>
                </div>
                <FaPen className="shrink-0 text-xs text-slate-300" />
              </div>

              {loadingProfile ? (
                <p className="text-sm font-semibold text-slate-400">
                  Profile details load ho rahe hain...
                </p>
              ) : null}
            </div>
          </div>

          {/* ── Password card ────────────────────────────────── */}
          <div
            ref={securitySectionRef}
            className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
                <FaLock />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">
                  Security
                </p>
                <h2 className="text-lg font-black text-slate-900">Change Password</h2>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500">
              Apna password yahan se safely update karein. Current credentials
              kabhi bhi screen par expose nahi hote.
            </p>

            <form onSubmit={handlePasswordChange} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="Enter current password"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>

            {/* Account overview strip */}
            <div className="mt-8 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Role
                </div>
                <div className="mt-1.5 text-base font-black text-slate-900">
                  {prettyRole}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Email
                </div>
                <div className="mt-1.5 truncate text-base font-black text-slate-900">
                  {email || "Not set"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;