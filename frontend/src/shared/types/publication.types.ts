export type Tag = { id: number; name: string };

export type PublicationInput = {
  name: string;
  authors: string[];
  description: string;
  year: number;
  source: string;
  url: string | null;
  file: string | null;
  pages: string | null;
  volN: string | null;
  isbn: string | null;
  tagIds: number[];
};

export type Publication = Omit<PublicationInput, 'tagIds'> & {
  id: number;
  tags: Tag[];
  fileUrl: string | null;
};

export type ScholarResult = {
  id: string | null;
  title: string;
  link: string | null;
  snippet: string | null;
  publicationInfo: string | null;
  year: number | null;
  citedBy: number | null;
  pdfUrl: string | null;
};
