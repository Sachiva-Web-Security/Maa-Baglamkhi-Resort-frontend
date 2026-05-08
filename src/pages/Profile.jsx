import React, { useEffect, useState } from "react";
import API from "../api";

const Profile = () => {
  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email] = useState(localStorage.getItem("email") || "");
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("avatarUrl") || "",
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Har baar Profile page khulte hi latest avatar localStorage se le lo
    const storedAvatar = localStorage.getItem("avatarUrl");
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
    }

    setLoadingProfile(false);

    // Cleanup: component unmount hone par camera band kar do
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
    } catch (err) {
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

      // Ensure full URL (http://localhost:5002 + /uploads/..)
      if (urlFromServer && !urlFromServer.startsWith("http")) {
        const apiBase = API.defaults.baseURL || "";
        const serverBase = apiBase.replace(/\/api\/?$/, "");
        urlFromServer = `${serverBase}${urlFromServer}`;
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
    <div className="flex items-start justify-center p-6">
      <div className="w-full max-w-5xl bg-white border border-gray-200 rounded-2xl shadow-sm grid md:grid-cols-2 gap-8 p-8 mt-2">
        {/* Left: avatar + basic info */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-4xl text-white shadow overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (name || "U").charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">{name || "User"}</h2>
            <p className="text-sm text-blue-600 font-medium">{prettyRole}</p>
          </div>

          <form onSubmit={handleAvatarUpload} className="w-full space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleStartCamera}
                className="simple-btn simple-btn-outline w-full"
              >
                Open Camera
              </button>

              {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}

              {cameraStream && (
                <div className="space-y-2">
                  <video
                    id="profile-camera-video"
                    className="w-full rounded-xl border border-gray-200"
                    autoPlay
                    muted
                  />
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    className="simple-btn simple-btn-primary w-full"
                  >
                    Capture Photo
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingAvatar || !avatarFile}
              className="simple-btn simple-btn-primary w-full disabled:opacity-60"
            >
              {loadingAvatar ? "Uploading..." : "Update Profile Picture"}
            </button>
          </form>
        </div>

        {/* Right: password change */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col justify-center space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Change Password</h3>
          <p className="text-xs text-gray-500 mb-2">
            Update your password below. Your current password is required for verification.
          </p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 mt-2">
            <div className="simple-form-group">
              <label className="simple-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="simple-input w-full"
                placeholder="Enter current password"
              />
            </div>

            <div className="simple-form-group">
              <label className="simple-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="simple-input w-full"
                placeholder="Enter new password"
              />
            </div>

            <div className="simple-form-group">
              <label className="simple-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="simple-input w-full"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="simple-btn simple-btn-primary w-full disabled:opacity-60"
            >
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          {loadingProfile && (
            <p className="text-xs text-gray-400 mt-2">
              Loading profile details...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
