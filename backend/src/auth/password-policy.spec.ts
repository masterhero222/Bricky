import { validate } from 'class-validator';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('Bricky password policy', () => {
  it.each(['Abc1', 'alllowercase123', 'NoDigitsHere']) (
    'rejects weak password %s',
    async (password) => {
      const dto = Object.assign(new RegisterUserDto(), {
        role: 'client',
        name: 'Test Client',
        email: 'client@example.com',
        password,
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it('accepts the same strong password for registration and reset', async () => {
    const password = 'Bricky1';
    const registration = Object.assign(new RegisterUserDto(), {
      role: 'client',
      name: 'Test Client',
      email: 'client@example.com',
      password,
    });
    const reset = Object.assign(new ResetPasswordDto(), {
      token: 'a'.repeat(64),
      newPassword: password,
    });

    expect(await validate(registration)).toHaveLength(0);
    expect(await validate(reset)).toHaveLength(0);
  });
});
