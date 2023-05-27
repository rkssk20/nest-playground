import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class UniquePostDto {
  @Field()
  @IsUUID(4)
  @IsNotEmpty()
  id: string;
}
