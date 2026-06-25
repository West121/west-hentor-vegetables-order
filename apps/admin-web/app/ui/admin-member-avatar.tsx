"use client";

type AdminMemberAvatarProps = {
  avatarUrl?: string | null;
  name?: string | null;
  phone?: string | null;
  size?: "sm" | "md";
};

function fallbackText(name?: string | null, phone?: string | null) {
  const normalizedName = name?.trim();
  if (normalizedName) {
    return normalizedName.slice(0, 1).toUpperCase();
  }

  const normalizedPhone = phone?.trim();
  if (normalizedPhone) {
    return normalizedPhone.slice(-2);
  }

  return "会";
}

export function AdminMemberAvatar({
  avatarUrl,
  name,
  phone,
  size = "md",
}: AdminMemberAvatarProps) {
  const normalizedAvatarUrl = avatarUrl?.trim();
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-12 w-12 text-base";

  return (
    <div
      className={[
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-[#dbe6dc] bg-[#eff8f1] font-semibold text-[#1f8f4f]",
        sizeClass,
      ].join(" ")}
    >
      <span>{fallbackText(name, phone)}</span>
      {normalizedAvatarUrl ? (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          src={normalizedAvatarUrl}
        />
      ) : null}
    </div>
  );
}
