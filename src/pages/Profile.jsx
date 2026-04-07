import React, { useEffect, useState } from "react";
import {
  FaCamera,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaUpload,
  FaUserCircle,
} from "react-icons/fa";
import API, { getBackendBaseURL } from "../api";
import { withAudit } from "../utils/auditAction";

const Profile = () => {
  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("avatarUrl") || "",
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load profile from backend on mount and sync to state + localStorage
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

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
  };

  // Camera: start video stream
  const handleStartCamera = async () => {
    try {
      setCameraError("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Camera support available nahi hai (browser permission).",
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
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

  // Camera: capture current frame as image file
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
      const file = new File([blob], "avatar-camera.jpg", {
        type: "image/jpeg",
      });
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(blob);
      setAvatarUrl(previewUrl);
    }, "image/jpeg");

    // Capture ke turant baad camera band kar do
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    const videoEl = document.getElementById("profile-camera-video");
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setCameraStream(null);
  };

  const handleAvatarUpload = async (e) => {
    e.preventDefault();
    if (!avatarFile) return;

    try {
      setLoadingAvatar(true);
      setMessage("");
      setError("");

      const formData = new FormData();
      formData.append("avatar", avatarFile);
      if (email) {
        formData.append("email", email);
      }

      // Backend: update profile picture for current user
      const res = await API.put(
        "/users/me/avatar",
        formData,
        withAudit("update_profile_avatar", {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      );

      let urlFromServer = res.data?.avatarUrl || res.data?.url || avatarUrl;

      // Ensure full URL for img src (e.g. http://localhost:5002/uploads/...)
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

      // Backend: change password for current user
      await API.post(
        "/users/change-password",
        {
          email,
          currentPassword,
          newPassword,
        },
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
    <div className="profile-page relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-5 sm:p-7 lg:p-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="w-full space-y-7">
        <section className="profile-hero overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-10">
          <div className="space-y-5">
            <div className="space-y-5">
              <p className="profile-hero-text text-xl font-semibold uppercase tracking-[0.3em]">
                Personal Workspace
              </p>
              <div className="space-y-3">
                <h1 className="profile-hero-title profile-hero-text max-w-3xl font-black">
                  Profile and security settings
                </h1>
                <p className="profile-body-lg profile-hero-text max-w-3xl">
                  Dashboard style personal profile jahan se aap profile picture,
                  email overview aur password update ko ek cleaner screen par manage kar sakein.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <div className="profile-card rounded-[26px] border border-white/60 bg-white/82 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative mx-auto sm:mx-0">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-5xl font-black text-white shadow-[0_16px_35px_rgba(14,165,233,0.25)]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="profile-section-title text-slate-900">
                    {name || "User"}
                  </div>
                  <div className="profile-chip mt-3 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 font-bold text-cyan-700">
                    <FaUserCircle />
                    {prettyRole}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 text-base text-slate-600">
                    <span className="inline-flex items-center justify-center gap-2 sm:justify-start">
                      <FaEnvelope className="text-slate-400" />
                      {email || "Email not set"}
                    </span>
                    <span className="inline-flex items-center justify-center gap-2 sm:justify-start">
                      <FaShieldAlt className="text-slate-400" />
                      Secure profile controls available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card rounded-[26px] border border-white/60 bg-white/82 p-6 backdrop-blur-xl">
              <div className="mb-5">
                <p className="profile-label text-emerald-400">
                  Profile Picture
                </p>
                <h2 className="profile-section-title mt-2 text-slate-900">
                  Update avatar
                </h2>
              </div>

              <form onSubmit={handleAvatarUpload} className="space-y-4">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="profile-input w-full rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 text-base text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-sky-600 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700"
                />

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="profile-action inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
                  >
                    <FaCamera />
                    Open Camera
                  </button>

                  {cameraError ? (
                    <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700">
                      {cameraError}
                    </div>
                  ) : null}

                  {cameraStream && (
                    <div className="space-y-3">
                      <video
                        id="profile-camera-video"
                        className="w-full rounded-[22px] border border-slate-200 bg-slate-950/90"
                        autoPlay
                        muted
                      />
                      <button
                        type="button"
                        onClick={handleCaptureFromCamera}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)] transition hover:-translate-y-0.5"
                      >
                        <FaCamera />
                        Capture Photo
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingAvatar || !avatarFile}
                  className="profile-primary inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaUpload />
                  {loadingAvatar ? "Uploading..." : "Update Profile Picture"}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            <div className="profile-card rounded-[26px] border border-white/60 bg-white/82 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-start gap-3">
                <span className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <FaLock />
                </span>
                <div>
                  <p className="profile-label text-emerald-400">
                    Security Center
                  </p>
                  <h2 className="profile-section-title mt-2 text-slate-900">
                    Change password
                  </h2>
                </div>
              </div>

              <p className="profile-body-lg mb-5 text-slate-600">
                Yahan se aap apna password safely update kar sakte hain. Current
                credentials screen par expose nahi honge aur update directly account security ke liye use hoga.
              </p>

              {error ? (
                <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mb-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-700">
                  {message}
                </div>
              ) : null}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="profile-label mb-2 block font-semibold uppercase text-slate-500">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="profile-input w-full rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="profile-label mb-2 block font-semibold uppercase text-slate-500">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="profile-input w-full rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="profile-label mb-2 block font-semibold uppercase text-slate-500">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="profile-input w-full rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    placeholder="Re-enter new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="profile-primary inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaLock />
                  {loadingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>

            <div className="profile-card rounded-[26px] border border-white/60 bg-white/82 p-6 backdrop-blur-xl">
              <p className="profile-label font-semibold uppercase text-emerald-400">
                Profile Status
              </p>
              <h2 className="profile-section-title mt-2 text-slate-900">
                Account overview
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 p-4">
                  <div className="profile-label font-semibold uppercase text-slate-500">
                    Role
                  </div>
                  <div className="profile-value mt-2">
                    {prettyRole}
                  </div>
                </div>
                <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 p-4">
                  <div className="profile-label font-semibold uppercase text-slate-500">
                    Email
                  </div>
                  <div className="mt-2 break-all text-base font-bold text-slate-900">
                    {email || "Not set"}
                  </div>
                </div>
              </div>

              {loadingProfile ? (
                <p className="profile-body-lg mt-4 font-semibold text-slate-500">
                  Profile details load ho rahe hain...
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
