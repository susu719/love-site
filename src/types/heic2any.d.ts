declare module "heic2any" {
  export default function heic2any(options: {
    blob: Blob;
    quality?: number;
    toType?: string;
  }): Promise<Blob | Blob[]>;
}
