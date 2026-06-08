import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('apple')
  @HttpCode(200)
  apple(@Body() dto: AppleAuthDto) {
    return this.authService.appleSignIn(dto);
  }

  @Post('google')
  @HttpCode(200)
  google(@Body() dto: GoogleAuthDto) {
    return this.authService.googleSignIn(dto);
  }
}
