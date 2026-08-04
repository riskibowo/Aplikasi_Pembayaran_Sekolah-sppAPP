import React, { useState } from 'react';

/**
 * Mengambil 1-2 huruf inisial dari nama.
 * "Riski Probo Sadewo" -> "RP"
 * "admin" -> "AD"
 */
const getInitials = (name) => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

/**
 * Menghasilkan warna background deterministik berdasarkan nama user.
 * Warna konsisten untuk nama yang sama.
 */
const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-600', 'bg-indigo-600', 'bg-violet-600',
    'bg-sky-600',  'bg-teal-600',   'bg-emerald-600',
    'bg-cyan-600', 'bg-purple-600', 'bg-fuchsia-600',
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Komponen UserAvatar dengan fallback inisial otomatis jika foto gagal dimuat.
 *
 * Props:
 *  - src       : URL foto profil (bisa null/undefined)
 *  - name      : Nama user, digunakan untuk inisial & warna fallback
 *  - className : Tambahan kelas CSS untuk container (mis. "w-10 h-10 rounded-full")
 *  - imgClassName : Tambahan kelas untuk elemen <img>
 *  - textClassName : Tambahan kelas untuk teks inisial
 */
const UserAvatar = ({ src, name, className = '', imgClassName = '', textClassName = '' }) => {
  const [imgError, setImgError] = useState(false);

  const showImage = src && !imgError;
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name || 'User'}
          className={`w-full h-full object-cover ${imgClassName}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${colorClass}`}>
          <span className={`font-bold select-none ${textClassName}`}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
