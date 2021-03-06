import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as passport from 'passport';

export class AppAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = { ...defaultOptions };
    const httpContext = context.switchToHttp();
    const [request, response] = [
      httpContext.getRequest(),
      httpContext.getResponse()
    ];
    
    /// <todo>
    /// TODO: Add validation that only one session fo one user can exists
    /// Use check like:
    ///
    ///  select *
    ///  from "session"
    ///  where cast(sess::jsonb#>'{passport,user,login}' as text) = '"admin"'
    ///  </todo>

    if (request.session && request.session.passport && request.session.passport.user) {
      return true;
    }
    const passportFn = createPassportContext(request, response);

    const user = await passportFn(
      'bearer',
      options
    );
    if (user) {
      request.login(user, (res) => { });
    }

    return true;
  }

}

const createPassportContext = (request, response) => (type, options) =>
  new Promise((resolve, reject) =>
    passport.authenticate(type, options, (err, user, info) => {
      try {
        return resolve(options.callback(err, user, info));
      } catch (err) {
        reject(err);
      }
    })(request, response, resolve)
  );

const defaultOptions = {
  session: true,
  property: 'user',
  callback: (err, user, info) => {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
};
