import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useAuth } from "../../lib/auth/useAuth";
import { requestPasswordResetRequest } from "../../lib/auth/authApi";
import Spinner from "../../components/Spinner/Spinner";
import {
  fetchPublicUser,
  updateOwnProfile,
  deleteOwnAccount,
  updateUserRole,
  reportUserRequest,
} from "../../lib/users/usersApi";
import { uploadImage, deleteImages } from "../../lib/uploads/uploadsApi";
import { useToast } from "../../components/Toast/useToast";
import ConfirmModal from "../listings/ConfirmModal";
import ReportUserModal from "./ReportUserModal";
import { clearListingsCache } from "../listings/useListings";
import styles from "./ProfilePage.module.css";

type Profile = {
  id: string;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string | null;
};

type ProfileFormData = {
  name: string;
  city: string;
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { logout } = useAuth();

  const {
    userId: currentUserId,
    email: currentUserEmail,
    isAdmin,
  } = useCurrentUser();
  const [banning, setBanning] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pwSending, setPwSending] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>();

  const isOwner = !!currentUserId && currentUserId === id;

  useEffect(() => {
    if (!id) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setSaveMsg(null);
      setServerError(null);
      setPwMsg(null);

      const data = await fetchPublicUser(id);

      if (!active) return;

      if (!data) {
        setNotFound(true);
        setProfile(null);
      } else {
        setProfile(data);
        reset({ name: data.name ?? "", city: data.city ?? "" });
      }
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [id, reset]);

  const onSave = async (values: ProfileFormData) => {
    if (!isOwner || !id) return;
    setSaving(true);
    setServerError(null);
    setSaveMsg(null);

    const name = values.name.trim();
    const city = values.city.trim() || null;

    try {
      await updateOwnProfile({ name, city });
    } catch (err) {
      setSaving(false);
      setServerError(
        err instanceof Error ? err.message : "Could not save profile.",
      );
      return;
    }

    setSaving(false);
    setProfile((prev) => (prev ? { ...prev, name, city } : prev));
    setSaveMsg("Profile updated.");
  };

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner || !id) return;

    if (!file.type.startsWith("image/")) {
      setServerError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerError("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    setServerError(null);
    setSaveMsg(null);

    const previousUrl = profile?.avatar_url ?? null;

    try {
      const url = await uploadImage(file, file.name);
      const updated = await updateOwnProfile({ avatarUrl: url });

      if (previousUrl) {
        await deleteImages([previousUrl]).catch(() => {});
      }

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: updated.avatar_url } : prev,
      );
      setSaveMsg("Avatar updated.");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not update avatar.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onChangePassword = async () => {
    if (!isOwner || !currentUserEmail) return;
    setPwSending(true);
    setPwMsg(null);
    setServerError(null);

    try {
      await requestPasswordResetRequest(currentUserEmail);
    } catch (err) {
      setPwSending(false);
      setServerError(
        err instanceof Error ? err.message : "Could not send reset email.",
      );
      return;
    }

    setPwSending(false);
    setPwMsg(`We've sent a password reset link to ${currentUserEmail}.`);
  };

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  const onDeleteAccount = async () => {
    if (!isOwner || !id) return;
    setDeletingAccount(true);

    try {
      await deleteOwnAccount();
    } catch (err) {
      setDeletingAccount(false);
      setDeleteAccountOpen(false);
      toast.error(
        err instanceof Error ? err.message : "Could not delete account.",
      );
      return;
    }

    clearListingsCache();
    await logout();
    toast.success("Your account has been deleted.");
    navigate("/");
  };

  const canBan =
    isAdmin && !isOwner && !!profile && profile.role !== "admin";

  const toggleBan = async () => {
    if (!canBan || !id || !profile) return;
    setBanning(true);

    const newRole: "user" | "banned" =
      profile.role === "banned" ? "user" : "banned";

    try {
      const updated = await updateUserRole(id, newRole);
      setBanning(false);
      setProfile((prev) => (prev ? { ...prev, role: updated.role } : prev));
      toast.success(
        newRole === "banned"
          ? `${profile.name || "User"} has been banned.`
          : `${profile.name || "User"} has been unbanned.`,
      );
    } catch (err) {
      setBanning(false);
      toast.error(
        err instanceof Error ? err.message : "Could not update user role.",
      );
    }
  };

  const handleReportUser = async (reason: string) => {
    if (!id || !currentUserId) return;
    setReporting(true);

    try {
      await reportUserRequest(id, reason);
      toast.success("Thanks - we’ll review this profile.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not report this user.";
      if (message.includes("already reported")) {
        toast.info(message);
      } else {
        toast.error(message);
      }
    } finally {
      setReporting(false);
      setReportOpen(false);
    }
  };

  const initials = (profile?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <Spinner size="lg" />
          <span>Loading profile…</span>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h2>Profile not found</h2>
          <p>This user doesn’t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.cardWrap}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <div className={styles.avatarBlock}>
              <div className={styles.avatar}>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name ?? "Avatar"}
                  />
                ) : (
                  <span className={styles.avatarFallback}>{initials}</span>
                )}
              </div>

              {isOwner && (
                <>
                  <button
                    type="button"
                    className={styles.avatarEdit}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Change avatar"
                    title="Change avatar"
                  >
                    {uploading ? "…" : "✎"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    hidden
                  />
                </>
              )}
            </div>

            <div className={styles.identity}>
              <h1 className={styles.name}>{profile.name || "Unnamed user"}</h1>
              <p className={styles.city}>
                {profile.city ? `📍 ${profile.city}` : "No location set"}
              </p>
              {profile.role === "admin" && (
                <span className={styles.badge}>Admin</span>
              )}
              {profile.role === "banned" && (
                <span className={styles.bannedBadge}>Banned</span>
              )}
            </div>
          </div>

          {serverError && (
            <div className={styles.serverError}>{serverError}</div>
          )}
          {saveMsg && <div className={styles.successMsg}>{saveMsg}</div>}

          {isOwner ? (
            <>
              <div className={styles.profileActions}>
                <Link to={`/profile/${id}/listings`} className={styles.linkBtn}>
                  My listings
                </Link>
              </div>

              <div className={styles.divider} />

              <form
                className={styles.form}
                onSubmit={handleSubmit(onSave)}
                noValidate
              >
                <h3 className={styles.sectionTitle}>Edit profile</h3>

                <div className={styles.field}>
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    aria-invalid={!!errors.name}
                    {...register("name", {
                      required: "Name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                  />
                  {errors.name && (
                    <span className={styles.errorMsg}>
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    placeholder="e.g. Sofia"
                    {...register("city")}
                  />
                </div>

                <button
                  className={styles.submit}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </form>

              <div className={styles.divider} />

              <div className={styles.security}>
                <h3 className={styles.sectionTitle}>Security</h3>
                <p className={styles.securityText}>
                  We’ll email you a secure link to set a new password.
                </p>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={onChangePassword}
                  disabled={pwSending}
                >
                  {pwSending ? "Sending…" : "Change password via email"}
                </button>
                {pwMsg && <div className={styles.successMsg}>{pwMsg}</div>}
                <button
                  type="button"
                  className={styles.logout}
                  onClick={onLogout}
                >
                  Log out
                </button>
              </div>

              <div className={styles.divider} />

              <div className={styles.dangerZone}>
                <h3 className={styles.sectionTitle}>Danger zone</h3>
                <p className={styles.dangerText}>
                  Deleting your account permanently removes your profile,
                  listings, photos and messages. This can’t be undone.
                </p>
                <button
                  type="button"
                  className={styles.deleteAccountBtn}
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  Delete account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.divider} />
              <div className={styles.readonly}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Name</span>
                  <span className={styles.infoValue}>
                    {profile.name || "—"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>City</span>
                  <span className={styles.infoValue}>
                    {profile.city || "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={styles.reportUserBtn}
                onClick={() => {
                  if (currentUserId) {
                    setReportOpen(true);
                  } else {
                    navigate("/login");
                  }
                }}
              >
                🚩 Report user
              </button>

              {canBan && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.adminActions}>
                    <h3 className={styles.sectionTitle}>Admin</h3>
                    <button
                      type="button"
                      className={
                        profile.role === "banned"
                          ? styles.unbanBtn
                          : styles.banBtn
                      }
                      onClick={toggleBan}
                      disabled={banning}
                    >
                      {banning
                        ? "…"
                        : profile.role === "banned"
                          ? "Unban user"
                          : "Ban user"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteAccountOpen}
        title="Delete account"
        message="This will permanently delete your profile, listings, photos and messages. This can’t be undone."
        confirmLabel="Delete account"
        loadingLabel="Deleting…"
        loading={deletingAccount}
        onConfirm={onDeleteAccount}
        onClose={() => setDeleteAccountOpen(false)}
      />

      <ReportUserModal
        open={reportOpen}
        loading={reporting}
        onSubmit={handleReportUser}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
