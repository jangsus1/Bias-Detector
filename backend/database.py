from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class UserData(db.Model):
    __tablename__ = 'user_data'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), nullable=False)
    dataset = db.Column(db.String(36), nullable=False)
    class_name = db.Column(db.String(36), nullable=False)
    batch_mask = db.Column(db.String)
    keywords = db.Column(db.String)
    invert = db.Column(db.Boolean)
    solution = db.Column(db.Integer)
    solution_query = db.Column(db.String(36))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    

    def __repr__(self):
        return f'<UserData {self.user_id}>'

def save_to_db(
    user_id,
    batch_mask,
    keywords,
    invert,
    solution,
    solution_query,
    dataset,
    class_name,
):
    '''
    Save data to database
    '''
    try:
        new_record = UserData(
            user_id=user_id,
            batch_mask=batch_mask,
            keywords=keywords,
            invert=invert,
            solution=solution,
            solution_query=solution_query,
            dataset=dataset,
            class_name=class_name,
        )
        db.session.add(new_record)
        db.session.commit()
        return True
       
    except Exception as e:
        db.session.rollback()
        print(f"Error saving to DB: {str(e)}")
        return False