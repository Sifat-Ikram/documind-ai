export const CLOUDINARY_ROOT_FOLDER = 'documind-ai';

export const userFolder = (userId: string): string =>
  `${CLOUDINARY_ROOT_FOLDER}/${userId}`;
