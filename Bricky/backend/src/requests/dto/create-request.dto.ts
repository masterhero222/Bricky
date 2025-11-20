export class CreateRequestDto {
  clientName: string;
  email: string;
  phone: string;
  address?: string;
  category?: string;
  description?: string;
}
