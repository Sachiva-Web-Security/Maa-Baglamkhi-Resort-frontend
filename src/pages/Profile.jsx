import React, { useEffect, useState } from "react";
import API, { getBackendBaseURL } from "../api";

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
      const res = await API.put("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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
      await API.post("/users/change-password", {
        email,
        currentPassword,
        newPassword,
      });

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
    <div className="resort-page ">
      <div className="resort-shell">
        <section className="resort-hero">
         <div className="resort-hero-content flex flex-col items-center justify-center text-center">
            <div className="space-y-3">
              <p className="resort-eyebrow">Personal Workspace</p>
              <h1 className="resort-title text-l">Profile and security settings</h1>
              <p className="resort-subtitle">
                Update your profile picture and password from a cleaner responsive
                screen designed for both mobile and desktop.
              </p>
            </div>
            <div className="resort-stat-grid">
              <div className="resort-stat">
                <span className="resort-stat-label">Current Role</span>
                <span className="resort-stat-value text-[1.1rem] ">{prettyRole}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Email</span>
                <span className="resort-stat-value text-[0.9rem] break-all">{email || "Not set"}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full max-w-6xl rounded-[2rem] border border-white/15 bg-white/[0.08] p-4 shadow-[0_24px_60px_rgba(2,8,23,0.22)] backdrop-blur-2xl md:p-8">
          <div className="grid gap-8 md:grid-cols-2">
        {/* Left: avatar + basic info */}
        <div className="flex flex-col items-center rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-6 text-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-4xl text-white shadow-lg overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                (name || "U").charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">{name || "User"}</h2>
            <p className="text-sm text-cyan-100">{prettyRole}</p>
            {email && (
              <p className="text-xs text-slate-300 mt-1">{email}</p>
            )}
          </div>

          <form onSubmit={handleAvatarUpload} className="w-full space-y-3 mt-2">
            {/* File from system */}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="w-full text-sm text-indigo-100 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
            />

            {/* Camera controls */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleStartCamera}
              className="w-full py-2 rounded-full bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition"
              >
                Open Camera
              </button>

              {cameraError && (
                <p className="text-[11px] text-red-300">{cameraError}</p>
              )}

              {cameraStream && (
                <div className="space-y-2">
                  <video
                    id="profile-camera-video"
                    className="w-full rounded-2xl border border-white/20 bg-black/40"
                    autoPlay
                    muted
                  />
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    className="w-full py-2 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Capture Photo
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingAvatar || !avatarFile}
              className="w-full py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60 disabled:hover:from-cyan-500 transition"
            >
              {loadingAvatar ? "Uploading..." : "Update Profile Picture"}
            </button>
          </form>
        </div>

        {/* Right: password change */}
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-6 flex flex-col justify-center space-y-4">
          <h3 className="text-xl font-semibold text-white mb-2">
            Change Password
          </h3>
          <p className="text-xs text-slate-300 mb-2">
            Yahan aap apna password change kar sakte hain. Email ya current
            password screen par kahi show nahi ho raha, sirf aap aur admin ke
            database me update hoga.
          </p>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-500/40 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-slate-200 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 text-sm text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-200 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 text-sm text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-200 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 text-sm text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60 transition"
            >
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          {loadingProfile && (
            <p className="text-xs text-slate-400 mt-2">
              Profile details load ho rahe hain...
            </p>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
