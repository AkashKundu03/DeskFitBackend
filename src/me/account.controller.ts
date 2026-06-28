import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { AccountService } from './account.service';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Controller('me/account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /** Delete immediately (revokes Apple credentials + removes all backend data). */
  @Post('delete')
  @HttpCode(200)
  delete(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.account.deleteNow(user.userId, dto.reason);
  }

  /** Schedule deletion in 7 days (recoverable until then). */
  @Post('schedule-deletion')
  @HttpCode(200)
  schedule(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.account.schedule(user.userId, dto.reason);
  }

  /** Recover an account during the 7-day window. */
  @Post('cancel-deletion')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser) {
    return this.account.cancel(user.userId);
  }

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.account.status(user.userId);
  }
}
