async sendConfirmationEmail(to: string, name: string) {
  await this.mailerService.sendMail({
    to,
    subject: "Благодарим за заявката!",
    template: './request-confirmation', 
    context: { name },  // <-- това е важно
  });
}
