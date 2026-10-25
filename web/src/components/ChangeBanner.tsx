"use client";

type ChangeBannerProps = {
  message: string;
  onClose: () => void;
};

export function ChangeBanner({ message, onClose }: ChangeBannerProps) {
  return (
    <div className="banner" role="status">
      <span>{message}</span>
      <button className="banner-close" type="button" aria-label="Dismiss" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
