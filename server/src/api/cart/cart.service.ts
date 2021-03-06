import { Cart } from './cart.model';
import { Injectable, Inject } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { Item } from '../inventory/item.model';
import { switchMap } from 'rxjs/operators';
import { CartDto } from './cart.dto';
import { IFindOptions, Sequelize } from 'sequelize-typescript';
import { User } from '../user/user.model';

const Op = Sequelize.Op

@Injectable()
export class CartService {

  public constructor(
    @Inject('CartRepository') private readonly cartRepository: typeof Cart,
    @Inject('ItemRepository') private readonly itemRepository: typeof Item
  ) { }

  getAll(companyId: string, dateFrom: Date, dateTo: Date, config): Observable<Array<Cart>> {
    const opts = <IFindOptions<Cart>>{
      where: {
        companyId
      },
      order: config.sort ? [[config.sort, config.direction || 'ASC']] : null
    }
    if (dateFrom) {
      opts.where['modifiedOn'] = opts.where['modifiedOn'] || {};
      Object.assign(opts.where['modifiedOn'], { [Op.gte]: dateFrom })
    }
    if (dateTo) {
      opts.where['modifiedOn'] = opts.where['modifiedOn'] || {};
      Object.assign(opts.where['modifiedOn'], { [Op.lte]: dateTo })
    }
    const response = this.cartRepository.findAll(opts);
    return from(response);
  }

  getById(id: string): Observable<Cart> {
    const response = this.cartRepository.scope('full').findById<Cart>(id);
    return from(response);
  }

  create(dto: CartDto, user: User): Observable<Cart> {
    dto.createdById = user.id;
    dto.modifiedById = user.id;
    if (dto.id) {
      return from(this.cartRepository.scope('raw').findById(dto.id))
        .pipe(switchMap(cart => {
          if (!cart) {
            return from(this.cartRepository.create(dto));
          }
          Object.keys(dto)
            .forEach(key => {
              cart.set(key, dto[key])
            });
          return cart.save();
        }));
    } else {
      const response = this.cartRepository.create(dto);
      return from(response);
    }
  }

  modify(id: string, dto: CartDto, user: User): Observable<Cart> {
    return from(this.cartRepository.scope('raw').findById(id))
      .pipe(switchMap(cart => {
        if (!dto || !cart) {
          return of(cart);
        }
        Object.keys(dto)
          .filter(key => ['id', 'history'].indexOf(key) === -1)
          .forEach(key => {
            cart.set(key, dto[key])
          });
        cart.modifiedById = user.id;
        return cart.save();
      }));
  }

}